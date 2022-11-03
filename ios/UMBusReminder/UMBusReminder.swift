//
//  UMBusWidget.swift
//  UMBusWidget
//
//  Created by Shogen Minami on 2022/11/2.
//

import WidgetKit
import SwiftUI
import ActivityKit

@main
struct UMBusWidgets: WidgetBundle {
    var body: some Widget {

        if #available(iOS 16.1, *) {
          UMBusActivityWidget()
        }
    }
}

struct DynamicIslandCompactTrailing: View {
  var body: some View {
    Image(systemName: "bus")
  }
}

struct DynamicIslandcompactLeading: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    Text(context.state.mesage)
  }
}

struct UMBusActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: UMBusAttributes.self) { context in
            // Create the presentation that appears on the Lock Screen and as a
            // banner on the Home Screen of devices that don't support the
            // Dynamic Island.
            // ...
          Text("Arrived at E11")
        } dynamicIsland: { context in
            // Create the presentations that appear in the Dynamic Island.
            // ...
          DynamicIsland {
            DynamicIslandExpandedRegion(.leading){
              Text("Demo by")
            }
            DynamicIslandExpandedRegion(.trailing){
              Text("Minami")
            }
            DynamicIslandExpandedRegion(.center){
              DynamicIslandcompactLeading(context: context)
            }
            DynamicIslandExpandedRegion(.bottom){
              Text("UM Campus Loop")
            }
          } compactLeading: {
            DynamicIslandcompactLeading(context: context)
          } compactTrailing: {
            DynamicIslandCompactTrailing()
          } minimal: {
            DynamicIslandCompactTrailing()
          }

        }
    }
}
