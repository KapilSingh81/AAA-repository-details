import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificateTimelinePopup } from './certificate-timeline-popup';

describe('CertificateTimelinePopup', () => {
  let component: CertificateTimelinePopup;
  let fixture: ComponentFixture<CertificateTimelinePopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificateTimelinePopup],
    }).compileComponents();

    fixture = TestBed.createComponent(CertificateTimelinePopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
