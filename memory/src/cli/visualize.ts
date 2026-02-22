#!/usr/bin/env node
/**
 * Memory Visualization CLI
 * Generate visual representations of agent memories
 */

import { writeFileSync } from 'fs';
import { MemorySystem } from '../index';

async function main() {
  const args = process.argv.slice(2);
  
  const agentId = args.find(arg => arg.startsWith('--agent='))?.split('=')[1];
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'visualization.html';
  
  if (!agentId) {
    console.error('Usage: tsx visualize.ts --agent=<uuid> [--output=<file>]');
    process.exit(1);
  }

  console.log('📊 DARKCITY Memory Visualization');
  console.log('=================================');
  console.log(`Agent: ${agentId.slice(0, 8)}\n`);

  const memorySystem = new MemorySystem();

  try {
    // Get memory stats
    const stats = await memorySystem.getMemoryStats(agentId);
    
    // Get experiences
    const experiences = await memorySystem.experience.getExperiencesByAgent(agentId, 1000);
    
    // Generate visualization
    const html = generateVisualization(agentId, stats, experiences);
    
    writeFileSync(output, html);
    console.log(`✅ Visualization saved to ${output}`);
    console.log(`   Open in browser to view`);

  } catch (error) {
    console.error('\n❌ Visualization failed:', error);
    process.exit(1);
  } finally {
    await memorySystem.close();
  }
}

function generateVisualization(agentId: string, stats: any, experiences: any[]): string {
  // Prepare data for charts
  const emotionalJourney = prepareEmotionalJourney(experiences);
  const activityByType = prepareActivityByType(stats.experiencesByType);
  const significanceDistribution = prepareSignificanceDistribution(experiences);
  const timeline = prepareTimeline(experiences);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Memory Visualization - ${agentId.slice(0, 8)}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a24 100%);
            color: #ffffff;
            padding: 2rem;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(90deg, #00ff88, #00aaff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: #888899;
            margin-bottom: 2rem;
            font-size: 1.1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
        }
        .stat-label {
            color: #888899;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #00ff88;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        .chart-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
        }
        .chart-title {
            font-size: 1.3rem;
            margin-bottom: 1rem;
            color: #ffffff;
        }
        canvas {
            max-height: 300px;
        }
        .timeline {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
        }
        .timeline-event {
            border-left: 3px solid #00ff88;
            padding-left: 1rem;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
        }
        .timeline-time {
            color: #00aaff;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .timeline-description {
            color: #ffffff;
            margin-top: 0.5rem;
        }
        .timeline-meta {
            color: #888899;
            font-size: 0.85rem;
            margin-top: 0.25rem;
        }
        .emotion-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            margin-top: 0.25rem;
        }
        .emotion-positive { background: rgba(0, 255, 136, 0.2); color: #00ff88; }
        .emotion-negative { background: rgba(255, 51, 102, 0.2); color: #ff3366; }
        .emotion-neutral { background: rgba(136, 136, 153, 0.2); color: #888899; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Agent Memory Visualization</h1>
        <div class="subtitle">Agent ID: ${agentId}</div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Experiences</div>
                <div class="stat-value">${stats.totalExperiences}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Significant Events</div>
                <div class="stat-value">${stats.significantExperiences}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Days Active</div>
                <div class="stat-value">${stats.consolidatedDays}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Last Activity</div>
                <div class="stat-value" style="font-size: 1rem;">
                    ${stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'Never'}
                </div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h2 class="chart-title">Emotional Journey</h2>
                <canvas id="emotionalChart"></canvas>
            </div>
            <div class="chart-card">
                <h2 class="chart-title">Activity by Type</h2>
                <canvas id="activityChart"></canvas>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h2 class="chart-title">Significance Distribution</h2>
                <canvas id="significanceChart"></canvas>
            </div>
        </div>

        <div class="timeline">
            <h2 class="chart-title">Recent Timeline</h2>
            ${timeline}
        </div>
    </div>

    <script>
        // Emotional Journey Chart
        const emotionalCtx = document.getElementById('emotionalChart').getContext('2d');
        new Chart(emotionalCtx, {
            type: 'line',
            data: ${JSON.stringify(emotionalJourney)},
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { 
                        ticks: { color: '#888899' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: { 
                        min: -1, max: 1,
                        ticks: { color: '#888899' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });

        // Activity by Type Chart
        const activityCtx = document.getElementById('activityChart').getContext('2d');
        new Chart(activityCtx, {
            type: 'doughnut',
            data: ${JSON.stringify(activityByType)},
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff' }
                    }
                }
            }
        });

        // Significance Distribution Chart
        const significanceCtx = document.getElementById('significanceChart').getContext('2d');
        new Chart(significanceCtx, {
            type: 'bar',
            data: ${JSON.stringify(significanceDistribution)},
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { 
                        ticks: { color: '#888899' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: { 
                        ticks: { color: '#888899' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    </script>
</body>
</html>
  `.trim();
}

function prepareEmotionalJourney(experiences: any[]) {
  const sorted = experiences
    .slice(0, 50)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    labels: sorted.map((exp, i) => `Event ${i + 1}`),
    datasets: [
      {
        label: 'Valence (Positive/Negative)',
        data: sorted.map(exp => exp.perception.emotional_valence),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Arousal (Energy)',
        data: sorted.map(exp => exp.perception.emotional_arousal),
        borderColor: '#00aaff',
        backgroundColor: 'rgba(0, 170, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };
}

function prepareActivityByType(typeStats: Record<string, number>) {
  const labels = Object.keys(typeStats);
  const data = Object.values(typeStats);
  
  const colors = [
    '#00ff88', '#00aaff', '#ff00aa', '#ffaa00', 
    '#aa44ff', '#ff4466', '#44ff88', '#8844ff'
  ];

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors.slice(0, labels.length),
      borderWidth: 0,
    }],
  };
}

function prepareSignificanceDistribution(experiences: any[]) {
  const buckets = [0, 0, 0, 0, 0]; // 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0
  
  for (const exp of experiences) {
    const sig = exp.perception.significance;
    const bucketIndex = Math.min(Math.floor(sig * 5), 4);
    buckets[bucketIndex]++;
  }

  return {
    labels: ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'],
    datasets: [{
      label: 'Number of Experiences',
      data: buckets,
      backgroundColor: '#00ff88',
      borderWidth: 0,
    }],
  };
}

function prepareTimeline(experiences: any[]): string {
  const recent = experiences.slice(0, 20);
  
  return recent.map(exp => {
    const time = new Date(exp.timestamp).toLocaleString();
    const emotion = exp.perception.emotional_valence > 0.3 ? 'positive' :
                    exp.perception.emotional_valence < -0.3 ? 'negative' : 'neutral';
    const emotionLabel = exp.perception.emotional_valence > 0.3 ? '😊 Positive' :
                        exp.perception.emotional_valence < -0.3 ? '😔 Negative' : '😐 Neutral';
    
    return `
      <div class="timeline-event">
        <div class="timeline-time">${time}</div>
        <div class="timeline-description">${exp.event.description}</div>
        <div class="timeline-meta">
          Type: ${exp.type} • 
          Significance: ${(exp.perception.significance * 100).toFixed(0)}%
        </div>
        <span class="emotion-badge emotion-${emotion}">${emotionLabel}</span>
      </div>
    `;
  }).join('\n');
}

main().catch(console.error);
