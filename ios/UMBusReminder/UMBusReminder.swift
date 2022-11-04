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

struct DynamicIslandCompactLeading: View {
  var body: some View {
    HStack(alignment: .center) {
      Image(systemName: "bus").foregroundColor(Color("UMLightBlue"))
    }
  }
}

struct DynamicIslandcompactTrailing: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    Text(context.state.message).foregroundColor(Color("UMLightBlue"))
  }
}

struct DynamicIslandLockScreen: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    VStack(alignment: .center) {
      Text(context.state.messageExpanding)
        .multilineTextAlignment(.center)
        .foregroundColor(Color.white)
        .font(Font.system(size:30))
        .font(.headline)
      Text("UM Campus Loop").multilineTextAlignment(.center)
        .foregroundColor(Color("UMOrange"))
        .font(Font.system(size:20))
        .font(.body)
    }
    .frame(maxWidth: .infinity, alignment: .center)
    .padding()
    .background(Color("UMBlue"))
  }
}

struct DynamicIslandExpandingCenter: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    VStack(alignment: .center) {
      Text(context.state.messageExpanding)
        .multilineTextAlignment(.center)
        .foregroundColor(Color("UMLightBlue"))
        .font(Font.system(size:30))
        .font(.headline)
      Text("UM Campus Loop").multilineTextAlignment(.center)
        .foregroundColor(Color("UMOrange"))
        .font(Font.system(size:20))
        .font(.body)
    }
  }
}

struct DynamicIslandExpandingBottom: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    VStack(alignment: .center) {
      Text(context.state.lastUpdatedTime)
        .multilineTextAlignment(.center)
        .foregroundColor(Color("UMLightBlue"))
        .font(Font.system(size:10))
        .font(.body)
      Text(context.state.serviceState).multilineTextAlignment(.center)
        .foregroundColor(Color("UMLightBlue"))
        .font(Font.system(size:10))
        .font(.body)
    }.padding(.top, 4)
  }
}

struct DynamicIslandExpandingTrailing: View {
  let context: ActivityViewContext<UMBusAttributes>
  var body: some View {
    VStack(alignment: .center) {
      Text("下一班").multilineTextAlignment(.center)
        .foregroundColor(Color("UMOrange"))
        .font(Font.system(size:13))
        .font(.body)
      Text(context.state.nextBusTime).multilineTextAlignment(.center)
        .foregroundColor(Color("UMLightBlue"))
        .font(Font.system(size:13))
        .font(.body)
    }.padding(.top, 30)
  }
}

struct DynamicIslandExpandingLeading: View {
  var body: some View {
    VStack(alignment: .center) {
      Image(systemName: "bus").resizable()
        .scaledToFit()
        .foregroundColor(Color("UMLightBlue"))
            .frame(minWidth:nil,
                   idealWidth: nil,
                   maxWidth: UIScreen.main.bounds.width,
                   minHeight: nil,
                   idealHeight: nil,
                   maxHeight: 35,
                   alignment: .center
                   )
      Text("UM ALL").multilineTextAlignment(.center)
        .foregroundColor(Color("UMLightBlue"))
        .font(Font.system(size:13))
        .font(.body)
    }.padding(.top, 25)
  }
}

struct UMBusActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: UMBusAttributes.self) { context in
            // Create the presentation that appears on the Lock Screen and as a
            // banner on the Home Screen of devices that don't support the
            // Dynamic Island.
            // ...
          DynamicIslandLockScreen(context: context)
        } dynamicIsland: { context in
            // Create the presentations that appear in the Dynamic Island.
            // ...
          DynamicIsland {
            DynamicIslandExpandedRegion(.leading){
              DynamicIslandExpandingLeading()
            }
            DynamicIslandExpandedRegion(.trailing){
              DynamicIslandExpandingTrailing(context: context)
            }
            DynamicIslandExpandedRegion(.center){
              DynamicIslandExpandingCenter(context: context)
            }
            DynamicIslandExpandedRegion(.bottom){
              DynamicIslandExpandingBottom(context: context)
            }
          } compactLeading: {
            DynamicIslandCompactLeading()
          } compactTrailing: {
            DynamicIslandcompactTrailing(context: context)
          } minimal: {
            DynamicIslandCompactLeading()
          }

        }
    }
}
