import { prisma } from '@/lib/prisma'
import { StockMovementType } from '@prisma/client'

const SERIAL_PREFIX = {
  ITEM: 'ITM',
  PURCHASE: 'PUR',
  ISSUE: 'ISS',
} as const

/**
 * Generate the next item code
 * Format: ITM-0001
 */
export async function generateItemCode(): Promise<string> {
  const prefix = SERIAL_PREFIX.ITEM
  
  // Find the highest existing item code
  const lastItem = await prisma.itemMaster.findFirst({
    orderBy: {
      itemCode: 'desc',
    },
    select: {
      itemCode: true,
    },
  })

  let nextNumber = 1
  
  if (lastItem?.itemCode) {
    // Extract the number part from the code (e.g., "ITM-0042" -> 42)
    const match = lastItem.itemCode.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  // Pad the number to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0')
  
  return `${prefix}-${paddedNumber}`
}

/**
 * Generate the next purchase number
 * Format: PUR-0001
 */
export async function generatePurchaseNumber(): Promise<string> {
  const prefix = SERIAL_PREFIX.PURCHASE
  
  // Find the highest existing purchase number
  const lastPurchase = await prisma.purchaseTransaction.findFirst({
    orderBy: {
      purchaseNumber: 'desc',
    },
    select: {
      purchaseNumber: true,
    },
  })

  let nextNumber = 1
  
  if (lastPurchase?.purchaseNumber) {
    // Extract the number part from the code (e.g., "PUR-0042" -> 42)
    const match = lastPurchase.purchaseNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  // Pad the number to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0')
  
  return `${prefix}-${paddedNumber}`
}

/**
 * Generate the next issue number
 * Format: ISS-0001
 */
export async function generateIssueNumber(): Promise<string> {
  const prefix = SERIAL_PREFIX.ISSUE
  
  // Find the highest existing issue number
  const lastIssue = await prisma.issueTransaction.findFirst({
    orderBy: {
      issueNumber: 'desc',
    },
    select: {
      issueNumber: true,
    },
  })

  let nextNumber = 1
  
  if (lastIssue?.issueNumber) {
    // Extract the number part from the code (e.g., "ISS-0042" -> 42)
    const match = lastIssue.issueNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  // Pad the number to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0')
  
  return `${prefix}-${paddedNumber}`
}

/**
 * Get current stock for an item at a specific location
 */
export async function getItemStock(itemId: string, locationId: string): Promise<number> {
  const movements = await prisma.stockMovement.findMany({
    where: {
      itemId,
      locationId,
    },
  })

  // Sum all movements (purchases are positive, issues are negative)
  const totalStock = movements.reduce((sum, movement) => {
    if (movement.movementType === StockMovementType.PURCHASE) {
      return sum + movement.quantity
    } else if (movement.movementType === StockMovementType.ISSUE) {
      return sum - movement.quantity
    }
    // For adjustments, quantity can be positive or negative
    return sum + movement.quantity
  }, 0)

  return totalStock
}

/**
 * Get current stock for an item across all locations
 */
export async function getItemStockAllLocations(itemId: string): Promise<number> {
  const movements = await prisma.stockMovement.findMany({
    where: {
      itemId,
    },
  })

  const totalStock = movements.reduce((sum, movement) => {
    if (movement.movementType === StockMovementType.PURCHASE) {
      return sum + movement.quantity
    } else if (movement.movementType === StockMovementType.ISSUE) {
      return sum - movement.quantity
    }
    return sum + movement.quantity
  }, 0)

  return totalStock
}

/**
 * Update item stock and create movement record
 */
export async function updateItemStock(
  itemId: string,
  locationId: string,
  quantity: number,
  movementType: StockMovementType,
  referenceId: string,
  createdById: string
): Promise<void> {
  // Store quantity as positive for all movement types
  // The sign is handled in getItemStock when calculating totals
  const movementQuantity = Math.abs(quantity)
  
  // Create stock movement record
  await prisma.stockMovement.create({
    data: {
      itemId,
      locationId,
      quantity: movementQuantity,
      movementType,
      referenceId,
      referenceType: movementType,
      createdById,
    },
  })
}

/**
 * Check stock levels and return status
 */
export async function checkStockLevels(
  itemId: string,
  locationId: string
): Promise<{
  currentStock: number
  minimumLevel: number
  maximumLevel: number
  isBelowMinimum: boolean
  isAboveMaximum: boolean
  status: 'LOW' | 'NORMAL' | 'HIGH'
}> {
  const item = await prisma.itemMaster.findUnique({
    where: { id: itemId },
    select: {
      minimumStockLevel: true,
      maximumStockLevel: true,
    },
  })

  if (!item) {
    throw new Error('Item not found')
  }

  const currentStock = await getItemStock(itemId, locationId)
  const isBelowMinimum = currentStock < item.minimumStockLevel
  const isAboveMaximum = currentStock > item.maximumStockLevel

  let status: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL'
  if (isBelowMinimum) {
    status = 'LOW'
  } else if (isAboveMaximum) {
    status = 'HIGH'
  }

  return {
    currentStock,
    minimumLevel: item.minimumStockLevel,
    maximumLevel: item.maximumStockLevel,
    isBelowMinimum,
    isAboveMaximum,
    status,
  }
}

/**
 * Validate sufficient stock for issue
 */
export async function validateStockForIssue(
  itemId: string,
  locationId: string,
  quantity: number
): Promise<{ isValid: boolean; availableStock: number; message?: string }> {
  const availableStock = await getItemStock(itemId, locationId)

  if (availableStock < quantity) {
    return {
      isValid: false,
      availableStock,
      message: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
    }
  }

  return {
    isValid: true,
    availableStock,
  }
}
