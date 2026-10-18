import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetTreeDto } from '../../models/asset.dto';

@Component({
  selector: 'app-asset-tree-node',
  standalone: true,
  imports: [CommonModule, AssetTreeNodeComponent],
  templateUrl: './asset-tree-node.component.html',
  styleUrl: './asset-tree-node.component.css'
})
export class AssetTreeNodeComponent {
  @Input() node!: AssetTreeDto;
  expanded = true;

  toggleExpand() {
    this.expanded = !this.expanded;
  }

  getLevelName(level: number): string {
    const levels: { [key: number]: string } = {
      1: 'Root',
      2: 'Group',
      3: 'Sub-Group',
      4: 'Item',
      5: 'Detail'
    };
    return levels[level] || `Level ${level}`;
  }
}
