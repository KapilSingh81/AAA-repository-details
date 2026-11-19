import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalizeDocumentPopup } from './finalize-document-popup';

describe('FinalizeDocumentPopup', () => {
  let component: FinalizeDocumentPopup;
  let fixture: ComponentFixture<FinalizeDocumentPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalizeDocumentPopup],
    }).compileComponents();

    fixture = TestBed.createComponent(FinalizeDocumentPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
