import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ContractApprovalPayload,
  CustomerContractSummary,
  SubContractPayload,
  UpdateBillOfQuantityPayload,
} from '../models/customer-contract.dto';

@Injectable({ providedIn: 'root' })
export class CustomerContractService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customer-stage-change-requests`;
  updateBillOfQuantity(
    contractId: number,
    payload: UpdateBillOfQuantityPayload,
  ): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${contractId}/bill-of-quantity`, payload);
  }
  getCurrentByCustomer(customerId: number): Observable<CustomerContractSummary> {
    return this.http.get<CustomerContractSummary>(`${this.baseUrl}/customer/${customerId}/current`);
  }

  getParentByCustomer(customerId: number): Observable<CustomerContractSummary> {
    return this.http.get<CustomerContractSummary>(`${this.baseUrl}/customer/${customerId}/parent`);
  }

  getById(contractId: number): Observable<CustomerContractSummary> {
    return this.http.get<CustomerContractSummary>(`${this.baseUrl}/contract/${contractId}`);
  }

  approve(contractId: number, payload: ContractApprovalPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${contractId}/approval`, payload);
  }

  getSubContracts(parentContractId: number): Observable<CustomerContractSummary[]> {
    return this.http.get<CustomerContractSummary[]>(
      `${this.baseUrl}/${parentContractId}/sub-contracts`,
    );
  }

  createSubContract(
    parentContractId: number,
    payload: SubContractPayload,
  ): Observable<CustomerContractSummary> {
    return this.http.post<CustomerContractSummary>(
      `${this.baseUrl}/${parentContractId}/sub-contracts`,
      payload,
    );
  }
}
