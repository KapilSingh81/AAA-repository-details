import { TestBed } from '@angular/core/testing';

import { MainDashobardService } from './main-dashobard-service';

describe('MainDashobardService', () => {
  let service: MainDashobardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MainDashobardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
