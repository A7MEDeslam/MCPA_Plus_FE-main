import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toastMsg = signal('');
  toastVisible = signal(false);
  private timer: any;

  show(msg: string) {
    this.toastMsg.set(msg);
    this.toastVisible.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }
}
