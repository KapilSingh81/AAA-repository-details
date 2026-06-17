import { TestBed } from '@angular/core/testing';

import { Notificaiton } from './notificaiton';

describe('Notificaiton', () => {
  let service: Notificaiton;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Notificaiton);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
