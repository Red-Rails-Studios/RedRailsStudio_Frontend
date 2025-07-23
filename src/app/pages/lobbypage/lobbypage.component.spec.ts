import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LobbypageComponent } from './lobbypage.component';

describe('LobbypageComponent', () => {
  let component: LobbypageComponent;
  let fixture: ComponentFixture<LobbypageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LobbypageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LobbypageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});