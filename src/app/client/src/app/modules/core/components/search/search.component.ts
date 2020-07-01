
import { filter } from 'rxjs/operators';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { UserService } from './../../services';
import { ResourceService, ConfigService, IUserProfile } from '@sunbird/shared';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';

/**
 * Main menu component
 */
@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
  currentSearchMode:string = 'Basic';
  showNLPSearch: boolean = false;
  showLoader: boolean = false;
  /**
   * Sui dropdown initiator
   */
  isOpen: boolean;

  showSuiSelectDropdown: boolean;

  /**
   *
   */
  queryParam: any = {};
  /**
   * value of current url
   */
  value: any;
  /**
   * key enter for search
   */
  key: string;
  resourceService: ResourceService;
  resourceDataSubscription: Subscription;


  /**
   * option selected on dropdown
   */
  selectedOption: string;
  /**
   * show input field
   */
  showInput: boolean;
  /**
   * input keyword depending on url
   */
  search: object;
  public frameworkData: object;
  /**
   * url
   */
  searchUrl: object;
  config: ConfigService;
  userProfile: IUserProfile;

  searchDropdownValues: Array<string> = ['All', 'Courses', 'Library'];
  
  contentSuggestions:any=[];

  courseSuggestions:any=[];

  searchPlaceHolderValue: string;

  searchDisplayValueMappers: object;

  /**
   * reference of UserService service.
   */
  public userService: UserService;

  /**
   * To navigate to other pages
   */
  private route: Router;
  /**
  * To send activatedRoute.snapshot to router navigation
  * service for redirection to parent component
  */
  private activatedRoute: ActivatedRoute;
  showContentSuggest: boolean;
  showCourseSuggest: boolean;
  /**
     * Constructor to create injected service(s) object
     * Default method of Draft Component class
     * @param {Router} route Reference of Router
     * @param {ActivatedRoute} activatedRoute Reference of ActivatedRoute
   */
  constructor(route: Router, activatedRoute: ActivatedRoute, userService: UserService,
    resourceService: ResourceService, config: ConfigService,
    private cdr: ChangeDetectorRef) {
    this.route = route;
    this.activatedRoute = activatedRoute;
    this.resourceService = resourceService;
    this.config = config;
    this.userService = userService;
    this.searchDisplayValueMappers = {
      'All': 'all',
      'Library': 'resources',
      'Courses': 'courses',
      'Users': 'users'
    };
    this.route.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        // if(_.split(this.route.url,'/')[1] == 'resources' || _.split(this.route.url,'/')[1] == 'learn') {
          // this.key = "";
        // }
      }
    });
  }
  ngDoCheck() {
    this.showNLPSearch = _.split(this.route.url,'/')[1] === 'resources' || _.split(this.route.url,'/')[2] === 'Library' ? true : false;
    this.showContentSuggest = _.split(this.route.url,'/')[1] === 'resources' || _.split(this.route.url,'/')[2] === 'Library' ? true : false;
    this.showCourseSuggest = _.split(this.route.url,'/')[1] === 'learn' || _.split(this.route.url,'/')[2] === 'Courses' ? true : false;
    if(_.split(this.route.url,'/')[1] !== 'resources' && _.split(this.route.url,'/')[2] !== 'Library') {
      this.currentSearchMode = "Basic";
    }
    if(!this.showContentSuggest && !this.showCourseSuggest) {
      this.showSuggestions([]);
    }
    if(this.showContentSuggest) {
      this.showSuggestions(this.contentSuggestions);
    }
    if(this.showCourseSuggest) {
      this.showSuggestions(this.courseSuggestions);
    }
  }
  showSuggestions(data) {
    (<any>$('.ui.search')).search({
      source: data,
      fullTextSearch: true,
      maxResults:6,
      cache:false,
      minCharacters:3,
      showNoResults:false
    });
  }
  ngOnInit() {
    this.userService.userData$.subscribe(userData => {
      if (userData && !userData.err) {
          this.frameworkData = _.get(userData.userProfile, 'framework');
      }
    });
    this.activatedRoute.queryParams.subscribe(queryParams => {
      this.queryParam = { ...queryParams };
      this.key = this.queryParam['key'];
    });
    this.userService.userData$.subscribe(userdata => {
      if (userdata && !userdata.err) {
        this.userProfile = userdata.userProfile;
        if (this.userProfile.rootOrgAdmin) {
            this.searchDropdownValues.push('Users');
        }
      }
      this.setFilters();
      this.route.events.pipe(
        filter(e => e instanceof NavigationEnd)).subscribe((params: any) => {
          this.setFilters();
        });
    });
    this.showSuiSelectDropdown = true;
    this.resourceDataSubscription = this.resourceService.languageSelected$
      .subscribe(item => {
        this.setSearchPlaceHolderValue();
      }
    );
    let self=this;
    $(function() {
      $('.results').on('click','.result',function() {
        self.onEnter(_.trim($(this).find('.title').text()));
      });
    });
    this.getContentSuggestionList();
    this.getCourseSuggestionList();
  }

  /**
   * on changing dropdown option
   * it navigate
   */
  onChange() {
    this.route.navigate([this.search[this.selectedOption], 1]);
  }
  getContentSuggestionList() {
    const data = {
      "request": {
        "filters": {
          "board": _.get(this.frameworkData,'board'),
          "medium": _.get(this.frameworkData,'medium'),
          "subject": _.get(this.frameworkData,'subject'),
          "gradeLevel": _.get(this.frameworkData,'gradeLevel'),
          "contentType": ["Collection", "TextBook", "LessonPlan", "Resource"],
        },
        "limit": 10000,
        "mode":'soft',
        "fields": ["name"]
      }
    };
    this.userService.getContentSuggestionList(data).subscribe(response=>{
      this.contentSuggestions = _.map(response.result.content,obj=>({title:obj.name}));
      this.showSuggestions(this.contentSuggestions);
    });
  }
  getCourseSuggestionList() {
    const data = {
      "request": {
        "filters": {},
        "limit": 10000,
        "mode":'soft',
        "fields": ["name"]
      }
    };
    this.userService.getCourseSuggestionList(data).subscribe(response=>{
      this.courseSuggestions = _.map(response.result.course,obj=>({title:obj.name}));
      this.showSuggestions(this.courseSuggestions);
    });
  }
  /**
   * search input box placeholder value
   */
  setSearchPlaceHolderValue () {
    const keyName = this.searchDisplayValueMappers[this.selectedOption];
    this.searchPlaceHolderValue = this.resourceService.frmelmnts['tab'] ? this.resourceService.frmelmnts.tab[keyName]  : '';
  }

  /**
   * on entering keyword
   * it navigate
   */
  onEnter(key) {
    this.key = key;
    this.queryParam = {};
    this.queryParam['key'] = this.key;
    if(_.split(this.route.url,'/')[1] === 'resources' || _.split(this.route.url,'/')[2] === 'Library') {
      this.queryParam['nlpSearch'] = this.currentSearchMode === 'Basic' ? false : true;
    }
    if (this.key && this.key.length > 0) {
      this.queryParam['key'] = this.key;
    } else {
      delete this.queryParam['key'];
    }
    this.route.navigate([this.search[this.selectedOption], 1], {
      queryParams: this.queryParam
    });
  }

  setFilters() {
    this.search = this.config.dropDownConfig.FILTER.SEARCH.search;
    this.searchUrl = this.config.dropDownConfig.FILTER.SEARCH.searchUrl;
    const currUrl = this.route.url.split('?');
    this.value = currUrl[0].split('/', 3);
    const searchEnabledStates = this.config.dropDownConfig.FILTER.SEARCH.searchEnabled;
    if (this.searchUrl[this.value[1]] && searchEnabledStates.includes(this.value[1])) {
      this.setDropdownSelectedOption(this.searchUrl[this.value[1]]);
    } else if (this.value[1] === 'search' && searchEnabledStates.includes(this.value[1])) {
      this.setDropdownSelectedOption(this.value[2]);
    } else {
      this.selectedOption = 'All';
      this.setSearchPlaceHolderValue();
      this.showInput = false;
    }
  }

  setDropdownSelectedOption (value) {
    if ( value === 'Users' ) {
      if ( !this.userProfile.rootOrgAdmin ) {
        this.selectedOption = 'All';
      } else {
        this.selectedOption = value;
        this.showSuiSelectDropdown = false;
        this.cdr.detectChanges();
        this.showSuiSelectDropdown = true;
      }
    } else {
      this.selectedOption = value;
    }
    this.setSearchPlaceHolderValue();
    this.showInput = true;
  }
}
