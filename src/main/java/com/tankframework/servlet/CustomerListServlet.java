package com.tankframework.servlet;

import com.tankframework.bean.Customer;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CustomerListServlet extends RestServlet {

    @Override
    protected Object process(HttpServletRequest request) {
        List<Customer> customerList = new ArrayList<Customer>();
        for (int i=0;i<10;i++) {
            Customer customer = new Customer();
            customer.setFirstName("firstName"+i);
            customer.setLastName("lastName"+i);
            customer.setSerialNumber("SN-0001-"+i);
            customerList.add(customer);
        }
        Map<String, Object> values = new HashMap<String, Object>();
        values.put("customers", customerList);
        return values;
    }


}
