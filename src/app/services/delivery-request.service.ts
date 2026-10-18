// services/delivery-request.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateDeliveryRequestPayload,
  EngineerDeliveryRequestListItem,
  EngineerDeliveryRequestDetails,
  WarehousePendingRequest,
  WarehouseDecisionPayload,
  ScanReceivePayload,
  InstallSerialPayload,
  ReservedSerialItem
} from '../models/delivery-request.dto';

@Injectable({ providedIn: 'root' })
export class DeliveryRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/delivery-requests`;

  // Engineer
  create(payload: CreateDeliveryRequestPayload): Observable<EngineerDeliveryRequestDetails> {
    return this.http.post<EngineerDeliveryRequestDetails>(this.baseUrl, payload);
  }

  getEngineerRequests(): Observable<EngineerDeliveryRequestListItem[]> {
    return this.http.get<EngineerDeliveryRequestListItem[]>(`${this.baseUrl}/engineer`);
  }

  getEngineerRequestById(id: number): Observable<EngineerDeliveryRequestDetails> {
    return this.http.get<EngineerDeliveryRequestDetails>(`${this.baseUrl}/engineer/${id}`);
  }

  // Warehouse
  getWarehousePending(): Observable<WarehousePendingRequest[]> {
    return this.http.get<WarehousePendingRequest[]>(`${this.baseUrl}/warehouse/pending`);
  }

  getWarehouseRequestById(id: number): Observable<WarehousePendingRequest> {
    return this.http.get<WarehousePendingRequest>(`${this.baseUrl}/warehouse/${id}`);
  }

  warehouseDecision(id: number, payload: WarehouseDecisionPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/warehouse-decision`, payload);
  }

  // Shared — callable from Angular (Warehouse tab) AND the React Native app
  uploadSignedDocument(id: number, file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/${id}/signed-document`, formData);
  }

  // Engineer / Receiver (mainly consumed from the RN app, kept here too for completeness)
  scanReceive(id: number, payload: ScanReceivePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/scan`, payload);
  }

  install(id: number, payload: InstallSerialPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/install`, payload);
  }
  getReservedSerials(contractId: number): Observable<ReservedSerialItem[]> {
    return this.http.get<ReservedSerialItem[]>(
      `${this.baseUrl}/customer-contracts/${contractId}/reserved-serials`,
    );
  }
  getWarehouseApproved(): Observable<WarehousePendingRequest[]> {
  return this.http.get<WarehousePendingRequest[]>(`${this.baseUrl}/warehouse/approved`);
}
}
