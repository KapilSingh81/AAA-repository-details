import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddDocment } from './add-docment';

describe('AddDocment', () => {
  let component: AddDocment;
  let fixture: ComponentFixture<AddDocment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddDocment],
    }).compileComponents();

    fixture = TestBed.createComponent(AddDocment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
