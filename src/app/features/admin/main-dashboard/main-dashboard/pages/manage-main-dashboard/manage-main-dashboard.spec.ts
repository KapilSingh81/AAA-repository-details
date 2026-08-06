import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMainDashboard } from './manage-main-dashboard';

describe('ManageMainDashboard', () => {
  let component: ManageMainDashboard;
  let fixture: ComponentFixture<ManageMainDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageMainDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageMainDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
