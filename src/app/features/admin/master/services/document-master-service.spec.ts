import { TestBed } from '@angular/core/testing';

import { DocumentMasterService } from './document-master-service';

describe('DocumentMasterService', () => {
  let service: DocumentMasterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentMasterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
