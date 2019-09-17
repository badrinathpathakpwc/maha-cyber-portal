import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
const telemetryEnv = 'signup';
import { UUID } from 'angular2-uuid';
import { SelfRegisterComponent } from './components';
const uuid = UUID.UUID();

const routes: Routes = [
  {
    path: '', component: SelfRegisterComponent,
    data: {
      telemetry: {
        env: telemetryEnv, pageid: 'self-register', uri: '/register',
        type: 'view', mode: 'self', uuid: uuid
      }
    }
  }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SelfRegisterRoutingModule { }
