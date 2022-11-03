//
//  DynamicIslandModule.swift
//  UMALL
//
//  Created by Shogen Minami on 2022/11/2.
//
import Foundation
import ActivityKit

@objc(DynamicIslandModule)
class DynamicIslandModule: NSObject {
  
  var BusStop:[String] = ["PGH","PGH🚍E4","E4","E4🚍N2","N2","N2🚍N6","N6","N6🚍E11","E11","E11🚍E21","E21","E21🚍E32","E32","E32🚍S4","S4","S4🚍PGH"," X "];
  var BusStopExpanding:[String] = ["Arrived at PGH","From PGH to E4","Arrived at E4","From E4 to N2","Arrived at N2","From N2 to N6","Arrived at N6","From N6 to E11","Arrived at E11","From E11 to E21","Arrived at E21","From E21 to E32","Arrived at E32","From E32 to S4","Arrived at S4","From S4 to PGH","There's no bus now."];
  @objc(startBusReminder: withMessage:)
  func startBusReminder(title:NSString, message:Int){
    let initialContentState = UMBusAttributes.ContentState(message:BusStop[message],messageExpanding: BusStopExpanding[message])
    let activityAttributes = UMBusAttributes(title: title as String)
    
    do {
      if #available(iOS 16.1, *){
        _ = try Activity.request(attributes: activityAttributes, contentState: initialContentState)
      } else {
        
      }
        print("Requested a Bus Reminder Live Activity.")
    } catch (_) {
        print("Error requesting Bus Reminder Live Activity.")
    }
  }
  
  @available(iOS 16.1, *)
  @objc(updateBusReminder:)
  func updateBusReminder(message:Int){
    let initialContentState = UMBusAttributes.ContentState(message:BusStop[message],messageExpanding:BusStopExpanding[message])
    
    Task {
      for activity in Activity<UMBusAttributes>.activities {
        await activity.update(using: initialContentState)
      }
    }
  }
  
  @available(iOS 16.1, *)
  @objc
  func endBusReminder(){
    let UMBusReminderStatus = UMBusAttributes.UMBusStatus(message: "Close", messageExpanding: "Close")
    
    Task{
      for activity in Activity<UMBusAttributes>.activities {
        await activity.end(using: UMBusReminderStatus, dismissalPolicy: .default)
      }
    }
  }
}
