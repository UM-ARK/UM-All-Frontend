//
//  DynamicIslandModule.swift
//  UMALL
//
//  Created by Shogen Minami on 2022/11/2.
//
import Foundation
import ActivityKit
import SwiftUI

@objc(DynamicIslandModule)
class DynamicIslandModule: NSObject {
  
  var BusStop:[String] = ["PGH","PGH->E4","E4","E4->N2","N2","N2->N6","N6","N6->E11","E11","E11->E21","E21","E21->E32","E32","E32->S4","S4","S4->PGH"," X "];
  var BusStopExpanding:[String] = ["Arrived at PGH","From PGH to E4","Arrived at E4","From E4 to N2","Arrived at N2","From N2 to N6","Arrived at N6","From N6 to E11","Arrived at E11","From E11 to E21","Arrived at E21","From E21 to E32","Arrived at E32","From E32 to S4","Arrived at S4","From S4 to PGH","There's no bus now."];
  @objc(startBusReminder: withMessage: withMessage: withMessage: withMessage:)
  func startBusReminder(title:NSString, message:Int, nextBusTime: NSString, serviceState: NSString, lastUpdatedTime: NSString){
    let initialContentState = UMBusAttributes.ContentState(message:BusStop[message],messageExpanding: BusStopExpanding[message], nextBusTime: nextBusTime as String, serviceState: serviceState as String, lastUpdatedTime: lastUpdatedTime as String)
    let activityAttributes = UMBusAttributes(title: title as String)
    
    do {
      if #available(iOS 16.1, *){
        _ = try Activity.request(attributes: activityAttributes, contentState: initialContentState)
      } else {
        Alert(title: Text("不受支持的iOS版本"),
              message: Text("实时活动和灵动岛功能需要iOS 16.1或更高版本的系统，请前往设置检查您的更新。"),
              dismissButton: .default(Text("OK")))
      }
        print("Requested a Bus Reminder Live Activity.")
    } catch (_) {
        print("Error requesting Bus Reminder Live Activity.")
    }
  }
  
  @objc(updateBusReminder: withMessage: withMessage: withMessage: )
  func updateBusReminder(message:Int, nextBusTime: NSString, serviceState: NSString, lastUpdatedTime: NSString){
    let initialContentState = UMBusAttributes.ContentState(message:BusStop[message],messageExpanding: BusStopExpanding[message], nextBusTime: nextBusTime as String, serviceState: serviceState as String, lastUpdatedTime: lastUpdatedTime as String)
    
    Task {
      if #available(iOS 16.1, *) {
        for activity in Activity<UMBusAttributes>.activities {
          await activity.update(using: initialContentState)
          print("Updated Bus Position.")
        }
      } else {
        //iOS 16.1以下设备不执行
      }
    }
  }
  
  @available(iOS 16.1, *)
  @objc
  func endBusReminder(){
    Task{
      for activity in Activity<UMBusAttributes>.activities {
        await activity.end(dismissalPolicy: .default)
        print("Ended Bus Reminder.")
      }
    }
  }
}
