import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SigningAssetsPopup } from './signing-assets-popup';

describe('SigningAssetsPopup', () => {
  let component: SigningAssetsPopup;
  let fixture: ComponentFixture<SigningAssetsPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SigningAssetsPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(SigningAssetsPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
