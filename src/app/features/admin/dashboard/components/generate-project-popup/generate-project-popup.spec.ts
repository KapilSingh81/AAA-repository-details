import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateProjectPopup } from './generate-project-popup';

describe('GenerateProjectPopup', () => {
  let component: GenerateProjectPopup;
  let fixture: ComponentFixture<GenerateProjectPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerateProjectPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateProjectPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
