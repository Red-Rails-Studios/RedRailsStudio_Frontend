import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResoursesComponent } from './resourses.component';

describe('RessoursesComponent', () => {
  let component: ResoursesComponent;
  let fixture: ComponentFixture<ResoursesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResoursesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
