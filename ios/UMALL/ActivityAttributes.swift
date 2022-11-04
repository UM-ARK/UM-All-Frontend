//
//  ActivityAttributes.swift
//  UMALL
//
//  Created by Shogen Minami on 2022/11/3.
//

import Foundation
import ActivityKit

struct UMBusAttributes: ActivityAttributes {
  public typealias UMBusStatus = ContentState
  
  public struct ContentState: Codable, Hashable {
    var message: String
    var messageExpanding: String
    var nextBusTime: String
    var serviceState: String
    var lastUpdatedTime: String
  }
  
  var title:String
}
