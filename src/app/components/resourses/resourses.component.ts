import { Component, OnInit, OnDestroy, Input, SimpleChanges, OnChanges } from '@angular/core';
import { Store } from '../../services/store';

@Component({
  selector: 'app-resourses',
  standalone: true,
  templateUrl: './resourses.component.html',
  styleUrls: ['./resourses.component.scss']
})
export class ResoursesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() sessionName: string = '';
  @Input() playerUid: string = '';
  private pollingStarted = false;

  constructor(public store: Store) {}

  ngOnInit(): void {
    // Optionally, you can remove this if you only want to react to changes
    this.store.setResources(this.sessionName, this.playerUid);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (!this.pollingStarted && this.sessionName && this.playerUid) {
    //   this.store.setResources(this.sessionName, this.playerUid);
    //   this.pollingStarted = true;
    // }
  }

  ngOnDestroy(): void {
    // No need to clearInterval, as setResources uses its own interval
    // If you want to clear, you need to refactor Store to allow interval cleanup
  }

  get energy() {
    return this.store.resources().energy_capacity;
  }
  get coinZahl() {
    return this.store.resources().DB_coin;
  }
  get workers() {
    return this.store.resources().man_power;
  }
}
