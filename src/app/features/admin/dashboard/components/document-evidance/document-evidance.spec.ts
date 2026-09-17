import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentEvidance } from './document-evidance';

describe('DocumentEvidance', () => {
  let component: DocumentEvidance;
  let fixture: ComponentFixture<DocumentEvidance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentEvidance],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentEvidance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
