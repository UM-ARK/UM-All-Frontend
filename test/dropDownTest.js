import React, {Component} from 'react';
import {View, Text} from 'react-native';

// https://hossein-zare.github.io/react-native-dropdown-picker-website/docs
import DropDownPicker from 'react-native-dropdown-picker';

class Test extends Component {
    state = {
        open: false,
        value: null,
        items: [
            {label: 'Apple', value: 'apple'},
            {label: 'Banana', value: 'banana'},
        ],
    };
    render() {
        // const [open, setOpen] = useState(false);
        // const [value, setValue] = useState(null);
        // const [items, setItems] = useState([
        //     {label: 'Apple', value: 'apple'},
        //     {label: 'Banana', value: 'banana'},
        // ]);

        const {open, value, items} = this.state;

        return (
            <View>
                <Text>下拉選項測試</Text>

                <DropDownPicker
                    open={open}
                    value={value}
                    items={items}
                    setOpen={value => this.setState({open: value})}
                    setValue={value => this.setState({value: value})}
                    setItems={value => this.setState({items: value})}
                />
            </View>
        );
    }
}

export default Test;
