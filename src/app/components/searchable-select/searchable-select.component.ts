import {
  Component,
  Input,
  forwardRef,
  signal,
  computed,
  HostListener,
  ElementRef,
  inject,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnDestroy {
  private el = inject(ElementRef);

  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  @Input() disabled = false;
  @Input() allowEmpty = false;
  @Input() emptyLabel = '-- Select --';

  open = signal(false);
  searchText = signal('');
  value: string | number | null = null;

  menuTop = signal(0);
  menuLeft = signal(0);
  menuWidth = signal(0);

  private scrollableParents: Element[] = [];
  private boundUpdatePosition = () => this.updatePosition();

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  filteredOptions = computed(() => {
    const term = this.searchText().toLowerCase().trim();

    if (!term) {
      return this.options;
    }

    return this.options.filter(x =>
      x.label.toLowerCase().includes(term)
    );
  });

  get selectedLabel(): string {
    if (
      this.value == null ||
      this.value === '' ||
      this.value === 0
    ) {
      return '';
    }

    const selected = this.options.find(x =>
      this.sameValue(x.value, this.value)
    );

    return selected?.label ?? '';
  }

  sameValue(
    a: string | number | null | undefined,
    b: string | number | null | undefined
  ): boolean {
    return String(a) === String(b);
  }

  writeValue(value: string | number | null): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private updatePosition(): void {
    const trigger = this.el.nativeElement.querySelector('.searchable-select-trigger');
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = 320; // approximate max height (search input + list)

    // Flip upward if not enough space below
    const spaceBelow = viewportHeight - rect.bottom;
    const top = spaceBelow < menuHeight && rect.top > menuHeight
      ? rect.top - menuHeight - 4
      : rect.bottom + 4;

    this.menuTop.set(top);
    this.menuLeft.set(rect.left);
    this.menuWidth.set(rect.width);
  }

  private getScrollableParents(el: Element): Element[] {
    const parents: Element[] = [];
    let current = el.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflow = style.overflow + style.overflowX + style.overflowY;
      if (/auto|scroll/.test(overflow)) {
        parents.push(current);
      }
      current = current.parentElement;
    }
    return parents;
  }

  private attachScrollListeners(): void {
    this.scrollableParents = this.getScrollableParents(this.el.nativeElement);
    this.scrollableParents.forEach(p => p.addEventListener('scroll', this.boundUpdatePosition, { passive: true }));
  }

  private detachScrollListeners(): void {
    this.scrollableParents.forEach(p => p.removeEventListener('scroll', this.boundUpdatePosition));
    this.scrollableParents = [];
  }

  toggle(): void {
    if (this.disabled) return;

    if (!this.open()) {
      this.searchText.set('');
      this.open.set(true);
      // Use requestAnimationFrame so the menu is in DOM before measuring
      requestAnimationFrame(() => {
        this.updatePosition();
        this.attachScrollListeners();
      });
    } else {
      this.open.set(false);
      this.detachScrollListeners();
    }

    this.onTouched();
  }

  select(option: SelectOption | null): void {
    const value =
      option?.value ??
      (this.allowEmpty ? null : this.value);

    this.value = value;

    this.onChange(value);

    this.open.set(false);

    this.searchText.set('');

    this.onTouched();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.open()) {
      this.updatePosition();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.open()) {
      this.updatePosition();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      if (this.open()) {
        this.open.set(false);
        this.detachScrollListeners();
      }
    }
  }

  ngOnDestroy(): void {
    this.detachScrollListeners();
  }
}