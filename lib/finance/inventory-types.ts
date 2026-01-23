import { LocationType, StockMovementType, InventoryTransactionStatus } from '@prisma/client'

// Location Master
export interface LocationMaster {
  id: string
  name: string
  code: string
  type: LocationType
  parentId: string | null
  parent: LocationMaster | null
  children: LocationMaster[]
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Item Master
export interface ItemMaster {
  id: string
  itemCode: string
  name: string
  price: number
  unit: string
  supplierId: string
  supplier: {
    id: string
    name: string
    partyType: string
  }
  locationId: string
  location: {
    id: string
    name: string
    code: string
  }
  minimumStockLevel: number
  maximumStockLevel: number
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  currentStock?: number // Calculated field
}

// Purchase Transaction
export interface PurchaseTransaction {
  id: string
  purchaseNumber: string
  itemId: string
  item: {
    id: string
    itemCode: string
    name: string
  }
  supplierId: string
  supplier: {
    id: string
    name: string
  }
  locationId: string
  location: {
    id: string
    name: string
    code: string
  }
  quantity: number
  unitPrice: number
  totalPrice: number
  purchaseDate: Date
  description: string | null
  status: InventoryTransactionStatus
  createdAt: Date
  createdById: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  updatedAt: Date
}

// Issue Transaction
export interface IssueTransaction {
  id: string
  issueNumber: string
  itemId: string
  item: {
    id: string
    itemCode: string
    name: string
  }
  locationId: string
  location: {
    id: string
    name: string
    code: string
  }
  quantity: number
  unitPrice: number
  totalPrice: number
  issuedToId: string
  issuedTo: {
    id: string
    name: string
    email: string
  }
  issueDate: Date
  description: string | null
  status: InventoryTransactionStatus
  createdAt: Date
  createdById: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  updatedAt: Date
}

// Stock Movement
export interface StockMovement {
  id: string
  itemId: string
  locationId: string
  quantity: number
  movementType: StockMovementType
  referenceId: string
  referenceType: StockMovementType
  createdAt: Date
  createdById: string
  createdBy: {
    id: string
    name: string
  }
}

// API Response Types
export interface LocationsResponse {
  data: LocationMaster[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ItemsResponse {
  data: ItemMaster[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PurchasesResponse {
  data: PurchaseTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface IssuesResponse {
  data: IssueTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Re-export Prisma types
export { LocationType, StockMovementType, InventoryTransactionStatus }
