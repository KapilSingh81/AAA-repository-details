import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateNewDocument } from './generate-new-document';

describe('GenerateNewDocument', () => {
  let component: GenerateNewDocument;
  let fixture: ComponentFixture<GenerateNewDocument>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerateNewDocument],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateNewDocument);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
