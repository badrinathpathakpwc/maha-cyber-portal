import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { ResourceService, ServerResponse, ToasterService, ConfigService } from '@sunbird/shared';
import { TelemetryService } from '@sunbird/telemetry';
import { OrgDetailsService } from '@sunbird/core';
import * as _ from 'lodash';
import { IStartEventInput, IImpressionEventInput, IInteractEventEdata } from '@sunbird/telemetry';
import { ActivatedRoute } from '@angular/router';
import { SignupService } from '../../../signup';
import { OrgManagementService } from '../../../../../../modules/org-management/services/org-management/org-management.service';
import { UserSearchService } from '../../../../../../modules/search/services/user-search/user-search.service';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-self-register',
  templateUrl: './self-register.component.html',
  styleUrls: ['./self-register.component.scss']
})
export class SelfRegisterComponent implements OnInit, OnDestroy {
  genderList: any = [];
  formIndex: number = 1;
  psDisabled: boolean = true;
  public unsubscribe = new Subject<void>();
  currentDate: Date = new Date();
  telemetryCdata: Array<{}>;
  tenantDataSubscription: Subscription;
  showUniqueError = '';
  basicDetailsForm: FormGroup;
  basicDetailsFormBuilder: FormBuilder;
  jobProfileForm: FormGroup;
  jobProfileFormBuilder: FormBuilder;
  submitInteractEdata: IInteractEventEdata;
  disableSubmitBtn: boolean;
  showPassword: boolean;
  cyberProfileConfig: any;
  rangeList: any = [];
  policeStationList: any = [];
  positionList: any = [];
  orgManagementService: OrgManagementService;
  orgDetailsService: OrgDetailsService;
  userSearchService: UserSearchService;
  createdUserId: any;
  organizationId: any;
  constructor(userSearchService: UserSearchService, orgDetailsService: OrgDetailsService, private datePipe: DatePipe, orgManagementService: OrgManagementService, public configService: ConfigService, public selfRegisterService: SignupService, formBuilder: FormBuilder, public resourceService: ResourceService, public toasterService: ToasterService, public activatedRoute: ActivatedRoute, public telemetryService: TelemetryService) {
    this.basicDetailsFormBuilder = formBuilder;
    this.jobProfileFormBuilder = formBuilder;
    this.orgManagementService = orgManagementService;
    this.orgDetailsService = orgDetailsService;
    this.userSearchService = userSearchService;
  }

  ngOnInit() {
    this.cyberProfileConfig = this.configService.cyberProfileConfig;
    this.initializeBasicForm();
    this.initializeJobProfileForm();
    this.setInteractEventData();
    this.rangeList = this.cyberProfileConfig.ranges;
    this.positionList = _.flatten(_.map(this.cyberProfileConfig.userType, 'designations'));
    this.genderList = [
      { 'name': 'Male' },
      { 'name': 'Female' }
    ]
  }

  initializeBasicForm() {
    this.basicDetailsForm = this.basicDetailsFormBuilder.group({
      firstName: new FormControl(null, [Validators.required, Validators.pattern(/^[a-zA-Z ]*$/)]),
      lastName: new FormControl(null, [Validators.required, Validators.pattern(/^[a-zA-Z ]*$/)]),
      userName: new FormControl(null, [Validators.required]),
      gender: new FormControl(null, [Validators.required]),
      password: new FormControl(null, [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl(null, [Validators.required, Validators.minLength(8)]),
      dob: new FormControl(null, [Validators.required]),
      phone: new FormControl(null, [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]),
      email: new FormControl(null, [Validators.email]),
      contactType: new FormControl('phone'),
      uniqueContact: new FormControl(null, [Validators.required])
    }, {
      validator: (formControl) => {
        const firstNameCtrl = formControl.controls.firstName;
        const lastNameCtrl = formControl.controls.lastName;
        const userNameCtrl = formControl.controls.userName;
        const passCtrl = formControl.controls.password;
        const conPassCtrl = formControl.controls.confirmPassword;
        if (_.trim(firstNameCtrl.value) === '') { firstNameCtrl.setErrors({ required: true }); }
        if (_.trim(lastNameCtrl.value) === '') { lastNameCtrl.setErrors({ required: true }); }
        if (_.trim(userNameCtrl.value) === '') { userNameCtrl.setErrors({ required: true }); }
        if (_.trim(passCtrl.value) === '') { passCtrl.setErrors({ required: true }); }
        if (_.trim(conPassCtrl.value) === '') { conPassCtrl.setErrors({ required: true }); }
        if (passCtrl.value !== conPassCtrl.value) {
          conPassCtrl.setErrors({ validatePasswordConfirmation: true });
        } else { conPassCtrl.setErrors(null); }
        return null;
      }
    });
    this.onContactTypeValueChanges();
    this.enableSignUpSubmitButton();
    this.onPhoneChange();
  }

  initializeJobProfileForm() {
    this.jobProfileForm = this.jobProfileFormBuilder.group({
      range: new FormControl(null, [Validators.required]),
      policeStation: new FormControl(null, [Validators.required]),
      position: new FormControl(null, [Validators.required]),
      joiningDate: new FormControl(null, [Validators.required]),
      // addressLine1: new FormControl(null, [Validators.required]),
      // addressLine2: new FormControl(null),
      // city: new FormControl(null, [Validators.required]),
      // zip: new FormControl(null, [Validators.required,Validators.pattern(/^[6-9]\d{9}$/)]),
      // state: new FormControl(null, [Validators.required]),
    }, {
      validator: (formControl) => {
        // const addressLine1Ctrl = formControl.controls.addressLine1;
        // const cityCtrl = formControl.controls.city;
        // const zipCtrl = formControl.controls.zip;
        // const stateCtrl = formControl.controls.state;
        // if (_.trim(addressLine1Ctrl.value) === '') { addressLine1Ctrl.setErrors({ required: true }); }
        // if (_.trim(cityCtrl.value) === '') { cityCtrl.setErrors({ required: true }); }
        // if (_.trim(zipCtrl.value) === '') { zipCtrl.setErrors({ required: true }); }
        // if (_.trim(stateCtrl.value) === '') { stateCtrl.setErrors({ required: true }); }
        // return null;
      }
    });
  }

  onContactTypeValueChanges(): void {
    const emailControl = this.basicDetailsForm.get('email');
    const phoneControl = this.basicDetailsForm.get('phone');
    this.basicDetailsForm.get('contactType').valueChanges.subscribe(
      (mode: string) => {
        this.setInteractEventData();
        this.basicDetailsForm.controls['uniqueContact'].setValue('');
        if (mode === 'email') {
          this.basicDetailsForm.controls['phone'].setValue('');
          emailControl.setValidators([Validators.required, Validators.pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,4}$/)]);
          phoneControl.clearValidators();
          this.onEmailChange();
        } else if (mode === 'phone') {
          this.basicDetailsForm.controls['email'].setValue('');
          emailControl.clearValidators();
          phoneControl.setValidators([Validators.required, Validators.pattern('^\\d{10}$')]);
          this.onPhoneChange();
        }
        emailControl.updateValueAndValidity();
        phoneControl.updateValueAndValidity();
      });
  }

  enableSignUpSubmitButton() {
    this.basicDetailsForm.valueChanges.subscribe(val => {
      if (this.basicDetailsForm.status === 'VALID') {
        this.disableSubmitBtn = false;
      } else {
        this.disableSubmitBtn = true;
      }
    });
  }

  onPhoneChange() {
    const phoneControl = this.basicDetailsForm.get('phone');
    let phoneValue = '';
    phoneControl.valueChanges.subscribe(
      (data: string) => {
        if (phoneControl.status === 'VALID' && phoneValue !== phoneControl.value) {
          this.basicDetailsForm.controls['uniqueContact'].setValue('');
          this.vaidateUserContact();
          phoneValue = phoneControl.value;
        }
      });
  }

  onEmailChange() {
    const emailControl = this.basicDetailsForm.get('email');
    let emailValue = '';
    emailControl.valueChanges.subscribe(
      (data: string) => {
        if (emailControl.status === 'VALID' && emailValue !== emailControl.value) {
          this.basicDetailsForm.controls['uniqueContact'].setValue('');
          this.vaidateUserContact();
          emailValue = emailControl.value;
        }
      });
  }

  vaidateUserContact() {
    const value = this.basicDetailsForm.controls.contactType.value === 'phone' ?
      this.basicDetailsForm.controls.phone.value.toString() : this.basicDetailsForm.controls.email.value;
    const uri = this.basicDetailsForm.controls.contactType.value.toString() + '/' + value;
    this.selfRegisterService.getUserByKey(uri).subscribe(
      (data: ServerResponse) => {
        this.showUniqueError = this.basicDetailsForm.controls.contactType.value === 'phone' ?
          this.resourceService.frmelmnts.lbl.uniquePhone : this.resourceService.frmelmnts.lbl.uniqueEmail;
      },
      (err) => {
        if (_.get(err, 'error.params.status') && err.error.params.status === 'USER_ACCOUNT_BLOCKED') {
          this.showUniqueError = this.resourceService.frmelmnts.lbl.blockedUserError;
        } else {
          this.basicDetailsForm.controls['uniqueContact'].setValue(true);
          this.showUniqueError = '';
        }
      }
    );
  }

  displayPassword() {
    if (this.showPassword) {
      this.showPassword = false;
    } else {
      this.showPassword = true;
    }
  }

  onSubmitSignUpForm() {
    this.disableSubmitBtn = true;
  }

  rangeDropDownChange(name) {
    this.policeStationList = _.get(_.find(this.rangeList, { name: name }), 'policeStations');
    this.psDisabled = false;
  }
  createCyberUser() {
    let orgFilter = {
      filters: {
        orgName: this.jobProfileForm.value.range
      },
      limit: 1
    }
    this.orgDetailsService.fetchOrgs(orgFilter).subscribe(response => {
      this.organizationId = response.result.response.content[0].id;
      console.log("Form Details");
      console.log(this.basicDetailsForm);
      console.log(this.jobProfileForm);
      let self = this;
      var tempData = _.find(this.cyberProfileConfig.userType, function (obj) {
        if (!_.isEmpty(_.find(obj.designations, { name: self.jobProfileForm.value.position }))) {
          return obj;
        }
      });
      let data = {
        "request": {
          "email": this.basicDetailsForm.value.email,
          "firstName": this.basicDetailsForm.value.firstName,
          "lastName": this.basicDetailsForm.value.lastName,
          "password": this.basicDetailsForm.value.password,
          "phone": _.toString(this.basicDetailsForm.value.phone),
          "channel": this.cyberProfileConfig.channel,
          "userName": this.basicDetailsForm.value.userName,
          "phoneVerified": true,
          "emailVerified": true,
          "gender": this.basicDetailsForm.value.gender,
          "dob": this.datePipe.transform(this.basicDetailsForm.value.dob, 'yyyy-MM-dd'),
          "grade": [this.jobProfileForm.value.position],
          "location": this.jobProfileForm.value.range,
          "organisationId": this.organizationId,
          "jobProfile": [
            {
              "jobName": this.jobProfileForm.value.position,
              "role": this.jobProfileForm.value.position,
              "joiningDate": this.datePipe.transform(this.jobProfileForm.value.joiningDate, 'yyyy-MM-dd'),
              "orgId": this.jobProfileForm.value.policeStation,
              "orgName": this.jobProfileForm.value.policeStation,
              "address": {
                "addType": "permanent",
                "addressLine1": "mumbai city",
                "addressLine2": "police station",
                "city": "mumbai",
                "state": "maharashtra",
                "zipCode": "123456"
              }
            }
          ]
        }
      }
      console.log("User Creation Model");
      console.log(data);
      this.orgManagementService.createUser(data).subscribe(response => {
        if (_.get(response, 'responseCode') === 'OK') {
          this.createdUserId = response.result.userId;
          let roleData = {
            userId: this.createdUserId,
            orgId: this.organizationId,
            roles: tempData.roles
          }
          this.userSearchService.updateRoles(roleData).subscribe(response => {

          }, err => {
            this.toasterService.error(this.resourceService.messages.emsg.m0005);
          })
        } else {
          this.toasterService.error(this.resourceService.messages.emsg.m0005);
        }
      }, (err) => {
        console.log(err);
        this.toasterService.error(this.resourceService.messages.emsg.m0005);
      })
    }, err => {
      console.log(err);
      this.toasterService.error(this.resourceService.messages.emsg.m0005);
    })
  }
  ngOnDestroy() {
    if (this.tenantDataSubscription) {
      this.tenantDataSubscription.unsubscribe();
    }
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  setInteractEventData() {
    this.submitInteractEdata = {
      id: 'submit-register',
      type: 'click',
      pageid: 'self-register',
      extra: {
        'contactType': this.basicDetailsForm.controls.contactType.value.toString()
      }
    };
    this.telemetryCdata = [{ 'type': 'register', 'id': this.activatedRoute.snapshot.data.telemetry.uuid }];
  }
}