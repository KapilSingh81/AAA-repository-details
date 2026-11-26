import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalPopup } from './approval-popup';

describe('ApprovalPopup', () => {
  let component: ApprovalPopup;
  let fixture: ComponentFixture<ApprovalPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(ApprovalPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
