export type Role = "ADMIN" | "FLEET_MANAGER" | "VIEWER";
export type VehicleStatus = "Active" | "Idle" | "Under Repair" | "Maintenance" | "Inactive";
export type OwnershipType = "Company Owned" | "Leased" | "Rented";

export interface User {
  username: string;
  displayName: string;
  email: string;
  role: Role;
  passwordHash: string;
}

export interface Vehicle {
  id: string;
  assetId?: string;
  name: string;
  type: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  plate?: string;
  stateRegistered?: string;
  mileage?: number;
  fuelType?: string;
  fuelCard?: string;
  gpsId?: string;
  location?: string;
  status: VehicleStatus;
  photo?: string;
  ownershipType: OwnershipType;
  ownerId?: string;
  vendor?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyLease?: number;
  currentValue?: number;
  monthlyPayment?: number;
  financialNotes?: string;
  regNumber?: string;
  regState?: string;
  regExpiry?: string;
  insProvider?: string;
  insPolicy?: string;
  insExpiry?: string;
  inspDate?: string;
  inspExpiry?: string;
  permitNumber?: string;
  permitExpiry?: string;
  createdAt: string;
  deleted?: boolean;
}

export interface Assignment {
  id: string;
  vehicleId: string;
  projectId?: string;
  driverId?: string;
  supervisor?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
}

export interface Owner {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  ownershipType: OwnershipType;
  status: "Active" | "Inactive";
  deleted?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  status: "Active" | "Inactive";
  deleted?: boolean;
}

export interface Project {
  id: string;
  name: string;
  customer?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status: "New" | "Active" | "Completed" | "On Hold" | "Cancelled";
  deleted?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  ain?: string;
  manufacturer?: string;
  vendor?: string;
  group: string;
  subGroup?: string;
  location?: string;
  costPrice?: number;
  status: "Active" | "In Storage" | "Disposed";
  deleted?: boolean;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  mileage?: number;
  cost?: number;
  vendor?: string;
  description?: string;
  parts?: string;
  nextServiceDate?: string;
  notes?: string;
  status: "Completed" | "Scheduled" | "In Progress";
  deleted?: boolean;
}

export interface DocumentRec {
  id: string;
  name: string;
  type: string;
  vehicleId?: string;
  issueDate?: string;
  expiryDate?: string;
  uploadedBy: string;
  uploadedDate: string;
  fileName?: string;
  fileData?: string;
  deleted?: boolean;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  module: string;
  record: string;
  at: string;
}

export interface Company {
  name: string;
  address: string;
  phone: string;
  email: string;
  expiryWarningDays: number;
  pageSize: number;
}

export interface DB {
  users: User[];
  vehicles: Vehicle[];
  assignments: Assignment[];
  owners: Owner[];
  drivers: Driver[];
  projects: Project[];
  assets: Asset[];
  maintenance: Maintenance[];
  documents: DocumentRec[];
  activity: Activity[];
  company: Company;
}
