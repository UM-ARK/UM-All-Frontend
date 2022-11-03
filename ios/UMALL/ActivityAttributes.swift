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
    var mesage: String
  }
  
  var title:String
}
