import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectViewDetails } from './project-view-details';

describe('ProjectViewDetails', () => {
  let component: ProjectViewDetails;
  let fixture: ComponentFixture<ProjectViewDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectViewDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectViewDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
