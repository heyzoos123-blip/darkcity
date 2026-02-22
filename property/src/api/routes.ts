import { Router, Request, Response } from 'express';
import { PropertyService } from '../services/property-service';
import { PaymentService } from '../services/payment-service';
import { EvictionService } from '../services/eviction-service';
import { LandService } from '../services/land-service';
import { CustomizationService } from '../services/customization-service';
import { PropertyTier } from '../types';

const router = Router();

// Service instances
const propertyService = new PropertyService();
const paymentService = new PaymentService();
const evictionService = new EvictionService();
const landService = new LandService();
const customizationService = new CustomizationService();

// ===== PROPERTY ROUTES =====

// List available properties
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const tier = req.query.tier as PropertyTier | undefined;
    const properties = await propertyService.listAvailableProperties(tier);
    res.json({ success: true, data: properties });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get property details
router.get('/properties/:id', async (req: Request, res: Response) => {
  try {
    const property = await propertyService.getProperty(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: property });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rent a property
router.post('/properties/:id/rent', async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.body;
    
    if (!agentAddress) {
      return res.status(400).json({ success: false, error: 'agentAddress required' });
    }

    const result = await propertyService.rentProperty(req.params.id, agentAddress);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get agent's current property
router.get('/agents/:address/property', async (req: Request, res: Response) => {
  try {
    const property = await propertyService.getAgentProperty(req.params.address);
    res.json({ success: true, data: property });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get property tier config
router.get('/tiers/:tier', async (req: Request, res: Response) => {
  try {
    const tier = req.params.tier as PropertyTier;
    const config = propertyService.getTierConfig(tier);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PAYMENT ROUTES =====

// Get payment history
router.get('/residencies/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await paymentService.getPaymentHistory(req.params.id);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process payment
router.post('/payments/:id/process', async (req: Request, res: Response) => {
  try {
    const { transactionSignature } = req.body;
    
    if (!transactionSignature) {
      return res.status(400).json({ success: false, error: 'transactionSignature required' });
    }

    await paymentService.processPayment(req.params.id, transactionSignature);
    res.json({ success: true, message: 'Payment processed successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get payment instruction
router.get('/payments/:id/instruction', async (req: Request, res: Response) => {
  try {
    const instruction = await paymentService.createPaymentInstruction(req.params.id);
    res.json({ success: true, data: instruction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== EVICTION ROUTES =====

// Get upcoming evictions (admin)
router.get('/evictions/upcoming', async (req: Request, res: Response) => {
  try {
    const evictions = await evictionService.getUpcomingEvictions();
    res.json({ success: true, data: evictions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent eviction history
router.get('/agents/:address/evictions', async (req: Request, res: Response) => {
  try {
    const evictions = await evictionService.getAgentEvictions(req.params.address);
    res.json({ success: true, data: evictions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual eviction (admin)
router.post('/residencies/:id/evict', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    await evictionService.manualEviction(req.params.id, reason || 'Administrative eviction');
    res.json({ success: true, message: 'Eviction processed' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== LAND ROUTES =====

// List available land plots
router.get('/land/available', async (req: Request, res: Response) => {
  try {
    const plots = await landService.listAvailablePlots();
    res.json({ success: true, data: plots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get land plot details
router.get('/land/:id', async (req: Request, res: Response) => {
  try {
    const plot = await landService.getPlot(req.params.id);
    if (!plot) {
      return res.status(404).json({ success: false, error: 'Land plot not found' });
    }
    res.json({ success: true, data: plot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent's land plots
router.get('/agents/:address/land', async (req: Request, res: Response) => {
  try {
    const plots = await landService.getAgentPlots(req.params.address);
    res.json({ success: true, data: plots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Purchase land
router.post('/land/:id/purchase', async (req: Request, res: Response) => {
  try {
    const { buyerAddress, transactionSignature } = req.body;
    
    if (!buyerAddress || !transactionSignature) {
      return res.status(400).json({ 
        success: false, 
        error: 'buyerAddress and transactionSignature required' 
      });
    }

    const plot = await landService.purchasePlot(
      req.params.id, 
      buyerAddress, 
      transactionSignature
    );
    
    res.json({ success: true, data: plot });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Transfer land
router.post('/land/:id/transfer', async (req: Request, res: Response) => {
  try {
    const { fromAddress, toAddress, price, transactionSignature } = req.body;
    
    if (!fromAddress || !toAddress || !transactionSignature) {
      return res.status(400).json({ 
        success: false, 
        error: 'fromAddress, toAddress, and transactionSignature required' 
      });
    }

    await landService.transferPlot(
      req.params.id, 
      fromAddress, 
      toAddress, 
      price, 
      transactionSignature
    );
    
    res.json({ success: true, message: 'Land transferred successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Build structure on land
router.post('/land/:id/build', async (req: Request, res: Response) => {
  try {
    const { ownerAddress, name, type, blueprint, buildCost, transactionSignature } = req.body;
    
    if (!ownerAddress || !name || !type || !blueprint || !transactionSignature) {
      return res.status(400).json({ 
        success: false, 
        error: 'ownerAddress, name, type, blueprint, and transactionSignature required' 
      });
    }

    const structure = await landService.buildStructure(
      req.params.id,
      ownerAddress,
      { name, type, blueprint, buildCost: buildCost || 0 },
      transactionSignature
    );
    
    res.json({ success: true, data: structure });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get structure on land
router.get('/land/:id/structure', async (req: Request, res: Response) => {
  try {
    const structure = await landService.getPlotStructure(req.params.id);
    res.json({ success: true, data: structure });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== CUSTOMIZATION ROUTES =====

// Get customizations
router.get('/:type(properties|structures)/:id/customizations', async (req: Request, res: Response) => {
  try {
    const targetType = req.params.type === 'properties' ? 'property' : 'structure';
    const customizations = await customizationService.getCustomizations(req.params.id, targetType);
    res.json({ success: true, data: customizations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add customization
router.post('/:type(properties|structures)/:id/customizations', async (req: Request, res: Response) => {
  try {
    const { slotIndex, itemType, itemData } = req.body;
    const targetType = req.params.type === 'properties' ? 'property' : 'structure';
    
    const customization = await customizationService.addCustomization(
      req.params.id,
      targetType,
      slotIndex,
      itemType,
      itemData
    );
    
    res.json({ success: true, data: customization });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Remove customization
router.delete('/customizations/:id', async (req: Request, res: Response) => {
  try {
    await customizationService.removeCustomization(req.params.id);
    res.json({ success: true, message: 'Customization removed' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== SPAWN POINT ROUTES =====

// Get spawn points
router.get('/:type(properties|structures)/:id/spawns', async (req: Request, res: Response) => {
  try {
    const targetType = req.params.type === 'properties' ? 'property' : 'structure';
    const spawns = await customizationService.getSpawnPoints(req.params.id, targetType);
    res.json({ success: true, data: spawns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add spawn point
router.post('/:type(properties|structures)/:id/spawns', async (req: Request, res: Response) => {
  try {
    const { name, positionX, positionY, positionZ, rotation, isDefault } = req.body;
    const targetType = req.params.type === 'properties' ? 'property' : 'structure';
    
    const spawn = await customizationService.addSpawnPoint(
      req.params.id,
      targetType,
      name,
      positionX,
      positionY,
      positionZ,
      rotation,
      isDefault
    );
    
    res.json({ success: true, data: spawn });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Set default spawn
router.put('/spawns/:id/default', async (req: Request, res: Response) => {
  try {
    const { targetId, targetType } = req.body;
    await customizationService.setDefaultSpawnPoint(
      req.params.id,
      targetId,
      targetType
    );
    res.json({ success: true, message: 'Default spawn point updated' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
