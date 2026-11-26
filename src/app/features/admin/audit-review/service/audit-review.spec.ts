import { TestBed } from '@angular/core/testing';

import { AuditReview } from './audit-review';

describe('AuditReview', () => {
  let service: AuditReview;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditReview);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
