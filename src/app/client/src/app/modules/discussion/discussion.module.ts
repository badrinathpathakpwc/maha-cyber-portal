import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscussionComponent } from './component';
import { CourseDiscussService } from './../discussion/services/course-discuss/course-discuss.service';
import { DiscussionService } from './services';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
// #NUIH change Froala Rich Text Editor Module Imported:
import { QuillEditorModule } from 'ngx-quill-editor';
import { TreeViewComponent } from './shared/tree-view.component';
import { TreeView } from './shared/tree-view.directory';
import { TreeViewService } from './shared/tree-view.service';
// #NUIH change:
import { TelemetryModule } from './../telemetry/telemetry.module';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    QuillEditorModule,
    TelemetryModule
  ],
  providers: [CourseDiscussService, DiscussionService, TreeViewService],
  exports: [DiscussionComponent, TelemetryModule],
  declarations: [DiscussionComponent, TreeViewComponent, TreeView]
})
export class DiscussionModule { }
