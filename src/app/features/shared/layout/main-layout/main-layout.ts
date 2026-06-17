import { Component } from '@angular/core';
import { Header } from "../header/header";

@Component({
  selector: 'app-main-layout',
  imports: [Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}
