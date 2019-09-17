import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelfRegisterComponent } from './components';
import { SuiModule } from 'ng2-semantic-ui/dist';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecaptchaModule } from 'ng-recaptcha';
import { TelemetryModule } from '@sunbird/telemetry';
import { SignupService } from '../signup';
import { UserSearchService } from '../../../../modules/search/services/user-search/user-search.service';
import { SelfRegisterRoutingModule } from './self-register-routing.module';
//Importing Primeng Calendar Module
import { CalendarModule } from 'primeng/calendar';
@NgModule({
  imports: [
    CommonModule,
    SelfRegisterRoutingModule,
    SuiModule,
    FormsModule,
    ReactiveFormsModule,
    RecaptchaModule,
    TelemetryModule,
    CalendarModule
  ],
  declarations: [SelfRegisterComponent],
  providers: [SignupService, UserSearchService]
})
export class SelfRegisterModule { }
