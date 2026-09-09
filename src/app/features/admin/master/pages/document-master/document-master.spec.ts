import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentMaster } from './document-master';

describe('DocumentMaster', () => {
  let component: DocumentMaster;
  let fixture: ComponentFixture<DocumentMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentMaster],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
