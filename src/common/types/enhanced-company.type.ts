export interface EnhancedCompany {
  id: string;
  cnpj: string;
  companyName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  planId?: string;
  status: string;
  trialStartDate?: Date;
  trialEndDate?: Date;
  trialStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  subscriptions?: unknown[];
  plan?: unknown;
  trial: {
    isOnTrial: boolean;
    isTrialExpired: boolean;
    trialDaysRemaining: number;
    trialStartDate: Date | null;
    trialEndDate: Date | null;
    trialStatus: string | null;
  };
  currentPlan: unknown;
  currentSubscription: unknown;
}
