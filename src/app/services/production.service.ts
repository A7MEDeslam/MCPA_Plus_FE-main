import { Injectable, signal, effect, inject } from '@angular/core';
import { MasterDataService } from './master-data.service';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private masterData = inject(MasterDataService);

  today = new Date().toISOString().slice(0,10);
  ProdOrders = signal<any[]>([]);
  BOMs = signal<any[]>([]);
  Serials = signal<any[]>([]);

  RawStock = signal<any>({});
  FGStock = signal<any>({});

  woCounter = 3000;
  srlCounter = 1;

  constructor() {
  effect(() => {
    const items = this.masterData.RAW_ITEMS();

    const rs: any = {};

    items.forEach(i => {
      rs[i.code] = {
        qty: i.currentStock || 0,
        lastDate: '-'
      };
    });

    this.RawStock.set(rs);
  });

  effect(() => {
    const products = this.masterData.PRODUCTS();

    const fgs: any = {};

    products.forEach(p => {
      fgs[p.code] = {
        qty: 0,
        total: 0,
        lastDate: '-'
      };
    });

    this.FGStock.set(fgs);
  });
}

  updateRawStock(itemCode: string, qty: number, date: string) {
    this.RawStock.update(rs => {
      const copy = { ...rs };
      if (!copy[itemCode]) {
        copy[itemCode] = { qty: 0, lastDate: '-' };
      }
      copy[itemCode] = { qty: copy[itemCode].qty + qty, lastDate: date };
      return copy;
    });
  }

  addProdOrder(d: any) {
    const id = 'WO-' + this.woCounter++;
    const prod = this.masterData.PRODUCTS().find(p => p.code === d.product);
    const newWO = {id, productCode:d.product, productName:prod?.name||'', qty:Number(d.qty), startDate:d.start, dueDate:d.due, status:'In Production', notes:d.notes||'', completedQty:0, yield:0};
    this.ProdOrders.update(o => [...o, newWO]);
  }

  addBOM(b: any) {
    this.BOMs.update(boms => [...boms, b]);
  }

  finalizeProd(woId: string, qty: number, date: string) {
    const wos = this.ProdOrders();
    const wo = wos.find(w => w.id === woId);
    if (!wo) return;
    
    const updatedWOs = wos.map(w => {
      if (w.id === woId) return {...w, qtyProduced: qty, status: 'Done'};
      return w;
    });
    this.ProdOrders.set(updatedWOs);

    const boms = this.BOMs().filter(b => b.product === wo.productCode);
    this.RawStock.update(rs => {
      const copy = {...rs};
      boms.forEach(b => {
        const currentQty = copy[b.material]?.qty || 0;
        copy[b.material] = { ...copy[b.material], qty: Math.max(0, currentQty - b.qty * qty) };
      });
      return copy;
    });

    this.FGStock.update(fgs => {
      const copy = {...fgs};
      const cur = copy[wo.productCode];
      copy[wo.productCode] = { ...cur, qty: cur.qty + qty, total: cur.total + qty, lastDate: date };
      return copy;
    });

    const prod = this.masterData.PRODUCTS().find(p => p.code === wo.productCode);
    const prefix = prod ? prod.prefix : 'SN';
    const newSerials: any[] = [];
    for (let i = 0; i < qty; i++) {
      const sn = prefix + '-' + String(this.srlCounter++).padStart(6,'0');
      newSerials.push({sn, productCode:wo.productCode, productName:wo.productName, wo:woId, date, status:'In Stock'});
    }
    this.Serials.update(s => [...s, ...newSerials]);
  }
}
