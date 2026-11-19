import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReuploadDocument } from './reupload-document';

describe('ReuploadDocument', () => {
  let component: ReuploadDocument;
  let fixture: ComponentFixture<ReuploadDocument>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReuploadDocument],
    }).compileComponents();

    fixture = TestBed.createComponent(ReuploadDocument);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
