import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RessoursesComponent } from './ressourses.component';

describe('RessoursesComponent', () => {
  let component: RessoursesComponent;
  let fixture: ComponentFixture<RessoursesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RessoursesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RessoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
