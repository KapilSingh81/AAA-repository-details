import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAuditReview } from './manage-audit-review';

describe('ManageAuditReview', () => {
  let component: ManageAuditReview;
  let fixture: ComponentFixture<ManageAuditReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAuditReview],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageAuditReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
