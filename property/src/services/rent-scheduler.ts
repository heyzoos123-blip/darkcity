import * as cron from 'node-cron';
import { PaymentService } from './payment-service';
import { EvictionService } from './eviction-service';
import { query } from '../db';

export class RentScheduler {
  private paymentService: PaymentService;
  private evictionService: EvictionService;

  constructor() {
    this.paymentService = new PaymentService();
    this.evictionService = new EvictionService();
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('🕐 Starting DARKCITY Rent Scheduler...');

    // Check for overdue payments every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running hourly payment check...');
      await this.checkOverduePayments();
    });

    // Attempt auto-debit for pending payments every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('💳 Attempting auto-debit for overdue payments...');
      await this.attemptAutoDebits();
    });

    // Check for evictions daily at 6 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('🚨 Running daily eviction check...');
      await this.evictionService.checkEvictions();
    });

    // Generate monthly reports on the 1st of each month at midnight
    cron.schedule('0 0 1 * *', async () => {
      console.log('📊 Generating monthly property report...');
      await this.generateMonthlyReport();
    });

    console.log('✅ Rent Scheduler started successfully');
  }

  /**
   * Check and mark overdue payments as late
   */
  private async checkOverduePayments(): Promise<void> {
    try {
      const overduePayments = await this.paymentService.getOverduePayments();
      
      for (const payment of overduePayments) {
        if (payment.status === 'PENDING') {
          await this.paymentService.markPaymentLate(payment.id);
          console.log(`⚠️ Payment ${payment.id} marked as LATE for agent ${payment.agent_address}`);
        }
      }

      console.log(`Checked ${overduePayments.length} overdue payments`);
    } catch (error) {
      console.error('Error checking overdue payments:', error);
    }
  }

  /**
   * Attempt auto-debit for overdue payments
   */
  private async attemptAutoDebits(): Promise<void> {
    try {
      const overduePayments = await this.paymentService.getOverduePayments();
      let successCount = 0;
      let failureCount = 0;

      for (const payment of overduePayments) {
        // Don't retry too many times
        if (payment.attempt_count >= 5) {
          console.log(`⏭️ Skipping payment ${payment.id} - max attempts reached`);
          continue;
        }

        const success = await this.paymentService.attemptAutoDebit(payment.id);
        
        if (success) {
          successCount++;
          console.log(`✅ Auto-debit successful for payment ${payment.id}`);
        } else {
          failureCount++;
          console.log(`❌ Auto-debit failed for payment ${payment.id} (attempt ${payment.attempt_count + 1})`);
        }

        // Rate limiting - wait 1 second between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Auto-debit complete: ${successCount} successful, ${failureCount} failed`);
    } catch (error) {
      console.error('Error attempting auto-debits:', error);
    }
  }

  /**
   * Generate monthly property report
   */
  private async generateMonthlyReport(): Promise<void> {
    try {
      const stats = await query(`
        SELECT 
          COUNT(DISTINCT p.id) as total_properties,
          COUNT(DISTINCT CASE WHEN p.status = 'OCCUPIED' THEN p.id END) as occupied_properties,
          COUNT(DISTINCT r.id) as active_residencies,
          COUNT(DISTINCT rp.id) FILTER (WHERE rp.status = 'PAID' AND rp.paid_date >= CURRENT_DATE - INTERVAL '30 days') as payments_last_month,
          COALESCE(SUM(rp.amount) FILTER (WHERE rp.status = 'PAID' AND rp.paid_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_last_month,
          COUNT(DISTINCT e.id) FILTER (WHERE e.evicted_at >= CURRENT_DATE - INTERVAL '30 days') as evictions_last_month,
          COUNT(DISTINCT lp.id) as total_land_plots,
          COUNT(DISTINCT CASE WHEN lp.owner_address IS NOT NULL THEN lp.id END) as owned_land_plots,
          COUNT(DISTINCT s.id) as total_structures
        FROM properties p
        LEFT JOIN residencies r ON p.id = r.property_id AND r.status = 'ACTIVE'
        LEFT JOIN rent_payments rp ON r.id = rp.residency_id
        LEFT JOIN evictions e ON p.id = e.property_id
        CROSS JOIN land_plots lp
        LEFT JOIN structures s ON lp.id = s.land_plot_id
      `);

      const report = stats.rows[0];
      
      console.log('\n📊 ===== DARKCITY MONTHLY PROPERTY REPORT =====');
      console.log(`Total Properties: ${report.total_properties}`);
      console.log(`Occupied Properties: ${report.occupied_properties}`);
      console.log(`Occupancy Rate: ${((report.occupied_properties / report.total_properties) * 100).toFixed(1)}%`);
      console.log(`Active Residencies: ${report.active_residencies}`);
      console.log(`Payments (Last 30 Days): ${report.payments_last_month}`);
      console.log(`Revenue (Last 30 Days): ${parseFloat(report.revenue_last_month).toFixed(4)} SOL`);
      console.log(`Evictions (Last 30 Days): ${report.evictions_last_month}`);
      console.log(`\nLand Plots: ${report.owned_land_plots}/${report.total_land_plots} owned`);
      console.log(`Custom Structures: ${report.total_structures}`);
      console.log('============================================\n');

      // Store report in database (optional)
      await query(
        `INSERT INTO monthly_reports (report_date, report_data)
         VALUES (CURRENT_DATE, $1)
         ON CONFLICT (report_date) DO UPDATE SET report_data = $1`,
        [JSON.stringify(report)]
      );
    } catch (error) {
      console.error('Error generating monthly report:', error);
    }
  }
}

// Run scheduler as standalone process
if (require.main === module) {
  const scheduler = new RentScheduler();
  scheduler.start();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down scheduler...');
    process.exit(0);
  });
}
