import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RiesgoComponent } from './pages/riesgo/riesgo.component';

const routes: Routes = [
  { path: 'riesgo', component: RiesgoComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
