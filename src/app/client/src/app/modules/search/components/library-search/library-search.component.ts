import {
    PaginationService, ResourceService, ConfigService, ToasterService, INoResultMessage,
    ICard, ILoaderMessage, UtilService, NavigationHelperService
} from '@sunbird/shared';
import { SearchService, PlayerService, UserService, FrameworkService } from '@sunbird/core';
import { IPagination } from '@sunbird/announcement';
import { combineLatest, Subject } from 'rxjs';
import { Component, OnInit, OnDestroy, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { IInteractEventEdata, IImpressionEventInput } from '@sunbird/telemetry';
import { takeUntil, map, mergeMap, first, filter, debounceTime } from 'rxjs/operators';
import { CacheService } from 'ng2-cache-service';
@Component({
    templateUrl: './library-search.component.html'
})
export class LibrarySearchComponent implements OnInit, OnDestroy {
    public showNLPSearch: boolean = false;
    public showLoader = true;
    public noResultMessage: INoResultMessage;
    public filterType: string;
    public queryParams: any;
    public hashTagId: string;
    public unsubscribe$ = new Subject<void>();
    public telemetryImpression: IImpressionEventInput;
    public inViewLogs = [];
    public sortIntractEdata: IInteractEventEdata;
    public dataDrivenFilters: any = {};
    public dataDrivenFilterEvent = new EventEmitter();
    public initFilters = false;
    public facets: Array<string>;
    public facetsList: any;
    public paginationDetails: IPagination;
    public contentList: Array<ICard> = [];
    public cardIntractEdata: IInteractEventEdata;
    public loaderMessage: ILoaderMessage;
    public sortingOptions;
    public redirectUrl;
    public frameworkData: object;
    public closeIntractEdata;

    constructor(public searchService: SearchService, public router: Router, private playerService: PlayerService,
        public activatedRoute: ActivatedRoute, public paginationService: PaginationService,
        public resourceService: ResourceService, public toasterService: ToasterService,
        public configService: ConfigService, public utilService: UtilService,
        public navigationHelperService: NavigationHelperService, public userService: UserService,
        public cacheService: CacheService, public frameworkService: FrameworkService) {
        this.paginationDetails = this.paginationService.getPager(0, 1, this.configService.appConfig.SEARCH.PAGE_LIMIT);
        this.filterType = this.configService.appConfig.library.filterType;
        this.redirectUrl = this.configService.appConfig.library.searchPageredirectUrl;
        this.sortingOptions = this.configService.dropDownConfig.FILTER.RESOURCES.sortingOptions;
        this.setTelemetryData();
    }
 
    ngOnInit() {
        this.userService.userData$.subscribe(userData => {
            if (userData && !userData.err) {
                this.frameworkData = _.get(userData.userProfile, 'framework');
            }
          });
        this.initFilters = true;
        this.dataDrivenFilterEvent.pipe(first()).
            subscribe((filters: any) => {
                this.dataDrivenFilters = filters;
                this.fetchContentOnParamChange();
                this.setNoResultMessage();
            });
    }
    public getFilters(filters) {
        this.facets = filters.map(element => element.code);
        const defaultFilters = _.reduce(filters, (collector: any, element) => {
            if (element.code === 'board') {
                collector.board = _.get(_.orderBy(element.range, ['index'], ['asc']), '[0].name') || '';
            }
            return collector;
        }, {});
        this.dataDrivenFilterEvent.emit(defaultFilters);
    }
    private fetchContentOnParamChange() {
        combineLatest(this.activatedRoute.params, this.activatedRoute.queryParams)
            .pipe(debounceTime(5), // wait for both params and queryParams event to change
                map(result => ({ params: { pageNumber: Number(result[0].pageNumber) }, queryParams: result[1] })),
                takeUntil(this.unsubscribe$)
            ).subscribe(({ params, queryParams }) => {
                this.showLoader = true;
                this.paginationDetails.currentPage = params.pageNumber;
                this.queryParams = { ...queryParams };
                this.contentList = [];
                this.fetchContents();
            });
    }
    private fetchContents() {
        let filters = _.pickBy(this.queryParams, (value: Array<string> | string) => value && value.length);
        filters = _.omit(filters, ['key', 'nlpSearch', 'sort_by', 'sortType', 'appliedFilters']);
        const softConstraintData = {
            filters: {channel: this.userService.hashTagId,
            board: [this.dataDrivenFilters.board]},
            softConstraints: _.get(this.activatedRoute.snapshot, 'data.softConstraints'),
            mode: 'soft'
          };
          const manipulatedData = this.utilService.manipulateSoftConstraint( _.get(this.queryParams, 'appliedFilters'),
          softConstraintData, this.frameworkData );
        const option = {
            filters: _.get(this.queryParams, 'appliedFilters') ?  filters :
            (_.get(manipulatedData, 'filters') ? _.get(manipulatedData, 'filters') : {}),
            limit: this.configService.appConfig.SEARCH.PAGE_LIMIT,
            pageNumber: this.paginationDetails.currentPage,
            query: this.queryParams.key,
            sort_by: { [this.queryParams.sort_by]: this.queryParams.sortType },
            mode: _.get(manipulatedData, 'mode'),
            facets: this.facets,
            params: this.configService.appConfig.Library.contentApiQueryParams
        };
        option.filters.contentType = filters.contentType ||
        ['Collection', 'TextBook', 'LessonPlan', 'Resource'];
        if (_.get(manipulatedData, 'filters')) {
            option['softConstraints'] = _.get(manipulatedData, 'softConstraints');
          }
        this.frameworkService.channelData$.subscribe((channelData) => {
            if (!channelData.err) {
               option.params.framework = _.get(channelData, 'channelData.defaultFramework');
            }
        });
        if(!_.isEmpty(this.queryParams.nlpSearch)) {
            option.params.nlpSearch = this.queryParams.nlpSearch;
        }
        this.searchService.contentSearch(option)
            .subscribe(data => {
                this.showLoader = false;
                this.facetsList = this.searchService.processFilterData(_.get(data, 'result.facets'));
                this.paginationDetails = this.paginationService.getPager(data.result.count, this.paginationDetails.currentPage,
                    this.configService.appConfig.SEARCH.PAGE_LIMIT);
                const { constantData, metaData, dynamicFields } = this.configService.appConfig.LibrarySearch;
                this.contentList = this.utilService.getDataForCard(data.result.content, constantData, dynamicFields, metaData);
            }, err => {
                this.showLoader = false;
                this.contentList = [];
                this.facetsList = [];
                this.paginationDetails = this.paginationService.getPager(0, this.paginationDetails.currentPage,
                    this.configService.appConfig.SEARCH.PAGE_LIMIT);
                this.toasterService.error(this.resourceService.messages.fmsg.m0051);
            });
    }
    public navigateToPage(page: number): void {
        if (page < 1 || page > this.paginationDetails.totalPages) {
            return;
        }
        const url = this.router.url.split('?')[0].replace(/[^\/]+$/, page.toString());
        this.router.navigate([url], { queryParams: this.queryParams });
    }
    private setTelemetryData() {
        this.telemetryImpression = {
            context: {
                env: this.activatedRoute.snapshot.data.telemetry.env
            },
            edata: {
                type: this.activatedRoute.snapshot.data.telemetry.type,
                pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
                uri: this.router.url,
                subtype: this.activatedRoute.snapshot.data.telemetry.subtype
            }
        };
        this.cardIntractEdata = {
            id: 'content-card',
            type: 'click',
            pageid: this.activatedRoute.snapshot.data.telemetry.pageid
        };
        this.closeIntractEdata = {
            id: 'search-close',
            type: 'click',
            pageid: 'library-search'
        };
        this.sortIntractEdata = {
            id: 'sort',
            type: 'click',
            pageid: 'library-search'
        };
    }
    public playContent(event) {
        this.playerService.playContent(event.data.metaData);
    }
    public inView(event) {
        _.forEach(event.inview, (elem, key) => {
            const obj = _.find(this.inViewLogs, { objid: elem.data.metaData.identifier });
            if (!obj) {
                this.inViewLogs.push({
                    objid: elem.data.metaData.identifier,
                    objtype: elem.data.metaData.contentType || 'content',
                    index: elem.id
                });
            }
        });
        this.telemetryImpression.edata.visits = this.inViewLogs;
        this.telemetryImpression.edata.subtype = 'pageexit';
        this.telemetryImpression = Object.assign({}, this.telemetryImpression);
    }
    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
    private setNoResultMessage() {
      this.noResultMessage = {
        'message': 'messages.stmsg.m0007',
        'messageText': 'messages.stmsg.m0006'
      };
    }
}
