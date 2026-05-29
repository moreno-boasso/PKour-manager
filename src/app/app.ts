import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ColdStartService } from './core/services/cold-start.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  constructor(private readonly coldStart: ColdStartService) {}

  ngOnInit(): void {
    // Wake up the backend on Render (cold start handling)
    this.coldStart.wakeUpBackend();
  }
}
