interface SubContractResourceForm {
  scope: string;
  item: string;
  qty: number | null;
}

interface SubContractForm {
  contractTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  exclusions: string;
  terms: string;
  comments: string;
  resources: SubContractResourceForm[];
}
