import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDetatils } from './project-detatils';

describe('ProjectDetatils', () => {
  let component: ProjectDetatils;
  let fixture: ComponentFixture<ProjectDetatils>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetatils],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetatils);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
