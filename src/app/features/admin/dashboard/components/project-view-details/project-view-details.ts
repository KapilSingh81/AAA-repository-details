import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalService } from 'ngx-bootstrap/modal';

interface Finding {
  sequence: number;
  affected_asset: string;
  vulnerability_title: string;
  cve_cwe: string;
  severity: string;
  detailed_observation: string;
  recommendation: string;
  reference: string;
  observation_type: string;
}

@Component({
  selector: 'app-project-view-details',
  imports: [CommonModule],
  templateUrl: './project-view-details.html',
  styleUrl: './project-view-details.scss',
})
export class ProjectViewDetails {
  private modalService = inject(BsModalService);

  @Input() findingData: Finding | null = null;

  close(e: any) {
    e.preventDefault();
    this.modalService.hide();
  }

  getSeverityClass(severity: string): string {
    const classes: { [key: string]: string } = {
      'Critical': 'bg-red-100 text-red-700',
      'High': 'bg-orange-100 text-orange-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-blue-100 text-blue-700',
      'default': 'bg-gray-100 text-gray-700'
    };
    return classes[severity] || classes['default'];
  }

  getSeverityIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      'Critical': '🔴',
      'High': '🟠',
      'Medium': '🟡',
      'Low': '🔵',
      'default': '⚪'
    };
    return icons[severity] || icons['default'];
  }
}