import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageDashboard } from './manage-dashboard';

describe('ManageDashboard', () => {
  let component: ManageDashboard;
  let fixture: ComponentFixture<ManageDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
